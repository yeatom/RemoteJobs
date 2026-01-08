/**
 * 简历相关服务工具
 */

export interface ResumeRecordParams {
  fileId: string;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  resumeInfo?: any;
}

/**
 * 将 AI 生成的简历二进制流处理并持久化
 * @param arrayBuffer PDF 二进制数据
 * @param jobInfo 关联的岗位信息
 */
export const processAndSaveAIResume = async (arrayBuffer: ArrayBuffer, jobInfo?: { id: string; title: string; company: string }) => {
  const fs = wx.getFileSystemManager();
  const tempFileName = `AI_Resume_${Date.now()}.pdf`;
  const tempFilePath = `${wx.env.USER_DATA_PATH}/${tempFileName}`;

  try {
    // 1. 写入临时文件
    fs.writeFileSync(tempFilePath, arrayBuffer, 'binary');

    // 2. 立即打开预览 (提升用户体验)
    wx.openDocument({
      filePath: tempFilePath,
      showMenu: true,
      success: () => console.log('预览成功'),
      fail: (err) => console.error('预览失败', err)
    });

    // 3. 静默上传到云开发存储
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: `resumes/${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`,
      filePath: tempFilePath
    });

    const fileId = uploadRes.fileID;

    // 4. 获取当前用户简历资料快照 (可选)
    const app = getApp<IAppOption>();
    const userProfile = (app.globalData as any).user?.resume_profile || {};

    // 5. 记录到数据库
    const recordParams: ResumeRecordParams = {
      fileId,
      jobId: jobInfo?.id,
      jobTitle: jobInfo?.title,
      company: jobInfo?.company,
      resumeInfo: userProfile
    };

    const res = await wx.cloud.callFunction({
      name: 'saveResumeRecord',
      data: recordParams
    });

    return {
      success: true,
      fileId,
      localPath: tempFilePath,
      result: (res.result as any)
    };
  } catch (err) {
    console.error('处理简历持久化失败:', err);
    throw err;
  }
};

